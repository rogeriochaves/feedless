//
//  PubsScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 30/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct PubsScreen: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var router : Router
    @EnvironmentObject var pubs : Pubs
    @EnvironmentObject var keyboard : KeyboardResponder
    @State private var invite = ""
    @State private var isInviteFocused = false

    func entriesList() -> some View {
        switch pubs.response {
        case .notAsked:
            return AnyView(EmptyView())
        case .loading:
            return AnyView(Text("Loading..."))
        case let .success(pub):
            return AnyView(
                Group {
                    Text("You are connected to \(pub.peers.count) pubs")
                        .padding(.horizontal)
                    List(pub.peers, id: \.address) { peer in
                        VStack(alignment: .leading) {
                            Text(peer.address)
                        }
                    }
                }
            )
        case let .error(message):
            return AnyView(Text(message))
        }
    }

    func errorMessage() -> some View {
        if case .error(_) = self.pubs.addInviteResponse {
            return AnyView(Text("Error adding invite"))
        }
        return AnyView(EmptyView())
    }

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 90, CGFloat(0)].max()! * -1
    }

    var body: some View {
        UITableView.appearance().backgroundColor = Styles.uiWhite

        return VStack(alignment: .leading) {
            entriesList()
                .navigationBarTitle(Text("Pubs"))
                .onAppear() {
                    self.pubs.load(context: self.context)
                    self.router.updateNavigationBarColor(route: .pubs)
                }

            VStack {
                Divider()

                MultilineTextField(
                            "Add new invite",
                            text: $invite,
                            isResponder: $isInviteFocused
                        )
                            .padding(5)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Styles.gray, lineWidth: 1)
                            )
                            .padding(.horizontal)

                        HStack {
                            errorMessage()
                            Spacer()
                            PrimaryButton(text: "Add invite", action: {
                                self.pubs.addInvite(context: self.context, invite: self.invite)
                                self.invite = ""
                            })
                        }
                            .padding(.horizontal)
                            .padding(.bottom)
            }
            .background(Color(Styles.uiWhite))
            .offset(y: keyboardOffset())
            .animation(.easeOut(duration: 0.16))
        }
    }
}

struct PubsScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu {
            PubsScreen()
        }
        .environmentObject(Samples.context())
        .environmentObject(Router())
        .environmentObject(Samples.pubs())
        .environmentObject(KeyboardResponder())
    }
}
