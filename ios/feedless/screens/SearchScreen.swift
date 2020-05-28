//
//  SearchScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 24/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct SearchScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var router : Router
    @EnvironmentObject var search : Search
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var query = ""
    @State private var showCancelButton: Bool = false

    init() {
        UITableView.appearance().tableHeaderView = UIView()
    }

    func peopleResults(_ results : [PeopleResult]) -> some View {
        return Section {
            Text("People").font(.headline)
            if results.count > 0 {
                ForEach(results, id: \.author) { result in
                    NavigationLink(destination: ProfileScreen(id: result.author)) {
                        HStack {
                            AsyncImage(url: Utils.avatarUrl(profile: result.authorProfile), imageLoader: self.imageLoader)
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 32, height: 32)
                                .border(Styles.darkGray)
                            Text(result.authorProfile.name ?? "unknown")
                        }
                    }
                }
            } else {
                Text("No results found")
            }
        }
    }

    func communitiesResults(_ results : [String]) -> some View {
        return Section {
            Text("Communities").font(.headline)
            if results.count > 0 {
                ForEach(results, id: \.self) { community in
                    NavigationLink(destination: CommunitiesShow(name: community)) {
                        HStack {
                            Text("#\(community)")
                        }
                    }
                }
            } else {
                Text("No results found")
            }
        }
    }

    var resultsLists : some View {
        switch search.results {
        case .notAsked:
            return AnyView(
                EmptyView()
            )
        case .loading:
            return AnyView(
                Section {
                    Text("Loading...")
                }
            )
        case let .success(results):
            return AnyView(
                Group {
                    peopleResults(results.people)
                    communitiesResults(results.communities)
                }
            )
        case let .error(message):
            return AnyView(
                Section {
                    Text(message)
                }
            )
        }
    }

    // From: https://stackoverflow.com/a/58473985/996404
    var searchButton : some View {
        HStack {
            HStack {
                Image(systemName: "magnifyingglass")

                TextField("search", text: $query, onEditingChanged: { isEditing in
                    self.showCancelButton = true
                }, onCommit: {
                    self.search.load(context: self.context, query: self.query)
                }).foregroundColor(.primary)

                Button(action: {
                    self.query = ""
                }) {
                    Image(systemName: "xmark.circle.fill").opacity(query == "" ? 0 : 1)
                }
            }
            .padding(EdgeInsets(top: 8, leading: 6, bottom: 8, trailing: 6))
            .foregroundColor(.secondary)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10.0)

            if showCancelButton  {
                Button("Cancel") {
                    UIApplication.shared.endEditing(true) // this must be placed before the other commands here
                    self.query = ""
                    self.showCancelButton = false
                }
                .foregroundColor(Color(.systemBlue))
            }
        }
    }

    var body: some View {
        VStack {
            List {
                searchButton
                resultsLists
            }
        }
        .navigationBarTitle(Text("Search"))
        .navigationBarHidden(showCancelButton)
        .onAppear {
            self.router.changeNavigationBarColorWithDelay(route: .search)
        }
    }
}

struct SearchScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SearchScreen()
                .environmentObject(Samples.context())
                .environmentObject(Samples.search())
//                .environmentObject(Search())
                .environmentObject(ImageLoader())
        }
    }
}
