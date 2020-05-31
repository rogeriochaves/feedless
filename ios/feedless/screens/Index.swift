//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

func statusToString(status: SSBStatus) -> String {
    switch status {
    case .initializing:
        return "Initializing"
    case .indexing:
        return "Indexing"
    case .syncing:
        return "Syncing"
    case .ready:
        return "Ready"
    }
}

struct Index: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var secrets : Secrets
    @EnvironmentObject var router : Router
    @State var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    func progressBar() -> some View {
        let width = CGFloat(self.context.indexing.current) / CGFloat(self.context.indexing.target) * 100;

        return ZStack(alignment: .leading) {
            Capsule()
                .foregroundColor(Styles.lightGray)
                .frame(width: 100, height: 10)

            Capsule()
                .frame(width: width, height: 10)
                .foregroundColor(Styles.primaryBlue)
                .animation(.easeIn)
        }
    }

    let mainScreen = MainScreen()

    var body: some View {
        VStack(spacing: 0) {
            if (context.ssbKey != nil) {
                mainScreen
                    .onAppear(perform: {
                        self.profiles.load(context: self.context, id: self.context.ssbKey!.id)
                        self.secrets.load(context: self.context)
                    })
            } else {
                NavigationView {
                    VStack(alignment: .leading) {
                        Spacer()
                        Text("The non-addictive\nsocial network")
                            .font(.system(size: 30))
                            .padding(.horizontal, 30)
                        NavigationLink(destination: Login()) {
                            Spacer()
                            Text("Create account")
                                .font(.system(size: 24))
                            Spacer()
                        }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 24)
                            .background(Styles.primaryBlue)
                            .foregroundColor(Color(Styles.uiDarkBlue))
                            .overlay(
                                RoundedRectangle(cornerRadius: 5)
                                    .stroke(Color(Styles.uiDarkBlue), lineWidth: 1)
                            )
                            .padding(.horizontal, 30)
                            .padding(.top, 20)
                        Spacer()
                        HStack {
                            Spacer()
                            Text("Have an account already?")
                            NavigationLink(destination: Login()) {
                                Text("Login")
                            }
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .background(Color(Styles.uiPink))
                                .foregroundColor(Color(Styles.uiDarkPink))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 5)
                                        .stroke(Color(Styles.uiDarkPink), lineWidth: 1)
                                )
                            Spacer()
                        }
                        .padding(.horizontal, 30)
                        .padding(.top, 30)
                        .padding(.bottom, context.status != .ready ? 30 : 80)
                        .background(Color(red: 255 / 255, green: 200 / 255, blue: 200 / 255))
                        .foregroundColor(Color(Styles.uiDarkPink))
                        .edgesIgnoringSafeArea(.bottom)
                    }
                    .navigationBarTitle("Feedless")
                    .background(Color(Styles.uiLightBlue))
                    .foregroundColor(Color(Styles.uiDarkBlue))
                    .onAppear() {
                        self.router.updateNavigationBarColor(route: .index)
                    }
                }.edgesIgnoringSafeArea(.bottom)
            }
            if (context.status != .ready) {
                Divider()
                    .padding(0)
                    .padding(.top, context.ssbKey != nil ? 10 : 0)
                HStack {
                    Text(statusToString(status: context.status))
                    if ((context.status == .indexing || context.status == .syncing) && context.indexing.target > 0) {
                        progressBar()
                    }
                }
                .padding(.top, 10)
            }
        }
        .onReceive(self.timer) { (_) in
            self.context.fetch()
        }
    }
}

struct Index_Previews: PreviewProvider {
    static func indexingContext() -> Context {
        let context = Context(ssbKey: nil, status: .indexing)
        context.indexing = IndexingState(current: 30, target: 100)
        return context
    }

    static func indexingSignedContext() -> Context {
        let context = Samples.context()
        context.status = .indexing
        context.indexing = IndexingState(current: 30, target: 100)
        return context
    }

    static var previews: some View {
        Group {
            Index()
                .environmentObject(indexingContext())
                .environmentObject(Router())

            Index()
                .environmentObject(Context(ssbKey: nil, status: .ready))
                .environmentObject(Router())

            Index()
                .environmentObject(indexingSignedContext())
                .environmentObject(Samples.profiles())
                .environmentObject(ImageLoader())
                .environmentObject(Router())
                .environmentObject(Secrets())
        }
    }
}

